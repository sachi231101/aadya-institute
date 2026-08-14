import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, UserCheck, GraduationCap, Clock, AlertTriangle, BookOpen, Search, Download, Plus,
  MoreVertical, X, Mail, Phone, Calendar, CheckCircle2, Circle, AlertCircle, FileText, Bell,
  CalendarDays, BarChart3, TrendingUp, TrendingDown, BookMarked, MonitorPlay, Star, UserMinus
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useBranchStore } from "@/store/branch.store";
import { useBranches } from "@/hooks/useBranches";

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
  const [selectedFaculty, setSelectedFaculty] = useState<any | null>(null);
  const [activePanelTab, setActivePanelTab] = useState("Overview");

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
                      onClick={() => {
                        setSelectedFaculty(fac);
                        setActivePanelTab("Performance");
                      }}
                      className={`transition-colors cursor-pointer group ${selectedFaculty?.id === fac.id ? "bg-blue-50/50" : "hover:bg-slate-50"}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img src={fac.avatar} alt={fac.name} className={`w-9 h-9 rounded-full border-2 ${selectedFaculty?.id === fac.id ? "border-[#1769AA]" : "border-slate-200"}`} />
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
                          className="h-7 px-3 text-xs border-[#1769AA]/30 text-[#1769AA] hover:bg-[#1769AA]/5 font-semibold shadow-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFaculty(fac);
                            setActivePanelTab("Performance");
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

      {/* ─── CENTERED FACULTY DETAILS & PERFORMANCE MODAL ─── */}
      {selectedFaculty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 relative bg-slate-50/70 shrink-0">
              <button 
                onClick={() => setSelectedFaculty(null)} 
                className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200/60 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                <img 
                  src={selectedFaculty.avatar} 
                  alt={selectedFaculty.name} 
                  className="w-20 h-20 rounded-2xl border-2 border-white shadow-md object-cover shrink-0" 
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                    <h2 className="text-2xl font-bold text-slate-900">{selectedFaculty.name}</h2>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      selectedFaculty.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/60' : 'bg-amber-50 text-amber-600 border border-amber-200/60'
                    }`}>
                      {selectedFaculty.status}
                    </span>
                    {selectedFaculty.rating > 0 && (
                      <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
                        <Star className="h-3.5 w-3.5 fill-current text-amber-500" /> {selectedFaculty.rating} / 5.0
                      </span>
                    )}
                  </div>
                  
                  <p className="text-xs text-slate-500 font-medium flex flex-wrap items-center gap-3 mb-2">
                    <span className="font-mono font-bold text-slate-700">{selectedFaculty.id}</span>
                    <span>•</span>
                    <span className="text-[#1769AA] font-semibold">{selectedFaculty.specialization}</span>
                    <span>•</span>
                    <span>{selectedFaculty.branch}</span>
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-medium">
                    <a href={`mailto:${selectedFaculty.email}`} className="hover:text-[#1769AA] flex items-center gap-1.5 transition-colors">
                      <Mail className="h-3.5 w-3.5 text-slate-400" /> {selectedFaculty.email}
                    </a>
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-slate-400" /> +91 {selectedFaculty.phone}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance KPI Snapshot Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 border-b border-slate-100 shrink-0 bg-white">
              <div className="p-4 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Assigned Batches</p>
                <h4 className="text-2xl font-black text-slate-900">{selectedFaculty.batchesCount}</h4>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Active ongoing</p>
              </div>
              <div className="p-4 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Students Taught</p>
                <h4 className="text-2xl font-black text-slate-900">{selectedFaculty.studentsCount}</h4>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Across batches</p>
              </div>
              <div className="p-4 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Weekly Workload</p>
                <h4 className="text-2xl font-black text-[#1769AA]">{selectedFaculty.workloadHrs}h <span className="text-sm font-normal text-slate-400">/wk</span></h4>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Teaching hours</p>
              </div>
              <div className="p-4 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Faculty Attendance</p>
                <h4 className="text-2xl font-black text-emerald-600">{selectedFaculty.attendance}%</h4>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">This month</p>
              </div>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex items-center px-6 border-b border-slate-100 bg-white shrink-0 overflow-x-auto gap-2">
              {[
                { name: "Performance", icon: Star },
                { name: "Batches & Courses", icon: BookMarked },
                { name: "Student Progress", icon: MonitorPlay },
                { name: "Weekly Schedule", icon: Calendar },
                { name: "Overview & Profile", icon: UserCheck }
              ].map((t) => (
                <button 
                  key={t.name} 
                  onClick={() => setActivePanelTab(t.name)}
                  className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    activePanelTab === t.name 
                      ? "border-[#1769AA] text-[#1769AA] bg-blue-50/50" 
                      : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                  }`}
                >
                  <t.icon className="h-3.5 w-3.5" />
                  {t.name}
                </button>
              ))}
            </div>

            {/* Modal Body Content (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
              
              {/* Tab 1: Performance */}
              {activePanelTab === "Performance" && (
                <div className="space-y-6">
                  {/* Rating Banner */}
                  <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                      <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Overall Faculty Rating</span>
                      <div className="flex items-center gap-3 mt-1">
                        <h3 className="text-3xl font-black text-amber-600">{selectedFaculty.rating} <span className="text-base font-medium text-slate-400">/ 5.0</span></h3>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className={`h-5 w-5 ${s <= selectedFaculty.rating ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"}`} />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Based on student post-class feedback across {selectedFaculty.batchesCount} active batches.</p>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attendance Rate</p>
                        <p className="text-xl font-bold text-emerald-600 mt-1">{selectedFaculty.attendance}%</p>
                      </div>
                      <div className="w-px h-10 bg-slate-100" />
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Student Pass Rate</p>
                        <p className="text-xl font-bold text-[#1769AA] mt-1">94%</p>
                      </div>
                    </div>
                  </div>

                  {/* 2-Column Performance Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Monthly Attendance Trend */}
                    <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                        <TrendingUp className="h-4 w-4 text-emerald-600" /> Monthly Attendance Trend
                      </h4>
                      <div className="h-44 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={ATTENDANCE_TREND} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                            <YAxis domain={[60, 100]} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                            <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} formatter={(v) => [`${v}%`, 'Attendance']} />
                            <Line type="monotone" dataKey="val" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Student Performance Breakdown */}
                    <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-3.5">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <MonitorPlay className="h-4 w-4 text-[#1769AA]" /> Student Grade Distribution
                      </h4>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold text-slate-700">Excellent (80-100%)</span>
                          <span className="font-bold text-emerald-600">{selectedFaculty.studentPerf.excellent} Students</span>
                        </div>
                        <ProgressBar value={(selectedFaculty.studentPerf.excellent / selectedFaculty.studentsCount) * 100 || 0} colorClass="bg-emerald-500" />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold text-slate-700">Good (60-79%)</span>
                          <span className="font-bold text-blue-500">{selectedFaculty.studentPerf.good} Students</span>
                        </div>
                        <ProgressBar value={(selectedFaculty.studentPerf.good / selectedFaculty.studentsCount) * 100 || 0} colorClass="bg-blue-500" />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold text-slate-700">Needs Improvement</span>
                          <span className="font-bold text-orange-500">{selectedFaculty.studentPerf.needsImp} Students</span>
                        </div>
                        <ProgressBar value={(selectedFaculty.studentPerf.needsImp / selectedFaculty.studentsCount) * 100 || 0} colorClass="bg-orange-400" />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold text-slate-700">At Risk (&lt;40%)</span>
                          <span className="font-bold text-red-600">{selectedFaculty.studentPerf.atRisk} Students</span>
                        </div>
                        <ProgressBar value={(selectedFaculty.studentPerf.atRisk / selectedFaculty.studentsCount) * 100 || 0} colorClass="bg-red-500" />
                      </div>
                    </div>
                  </div>

                  {/* Student Feedback Reviews */}
                  {selectedFaculty.feedback?.length > 0 && (
                    <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-3">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Star className="h-4 w-4 text-amber-500" /> Recent Student Feedback
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {selectedFaculty.feedback.map((fb: any, i: number) => (
                          <div key={i} className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/50 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-800">{fb.student}</span>
                              <span className="text-[10px] text-slate-400">{fb.date}</span>
                            </div>
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star key={s} className={`h-3 w-3 ${s <= fb.rating ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"}`} />
                              ))}
                            </div>
                            <p className="text-xs text-slate-600 italic">"{fb.text}"</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Batches & Courses */}
              {activePanelTab === "Batches & Courses" && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Assigned Batches ({selectedFaculty.batches.length})</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedFaculty.batches.length > 0 ? selectedFaculty.batches.map((b: any) => (
                      <div key={b.id} className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:border-[#1769AA]/30 transition-all space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs font-mono font-bold text-[#1769AA] bg-blue-50 px-2 py-0.5 rounded">{b.id}</span>
                            <h4 className="text-sm font-bold text-slate-900 mt-1.5">{b.name}</h4>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${b.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/60' : 'bg-purple-50 text-purple-600 border border-purple-200/60'}`}>
                            {b.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 pt-1">
                          <div className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-slate-400" /> {b.students} Students</div>
                          <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-slate-400" /> {b.time}</div>
                        </div>
                        <div className="pt-2 border-t border-slate-50">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-semibold text-slate-600">Course Progress</span>
                            <span className="font-bold text-[#1769AA]">{b.progress}%</span>
                          </div>
                          <ProgressBar value={b.progress} colorClass="bg-blue-600" />
                        </div>
                      </div>
                    )) : (
                      <p className="text-xs text-slate-500 italic">No active batches assigned.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: Student Progress */}
              {activePanelTab === "Student Progress" && (
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-5">
                  <div className="text-center pb-4 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Enrolled Students</p>
                    <p className="text-4xl font-black text-slate-900 my-1">{selectedFaculty.studentsCount}</p>
                    <p className="text-xs text-slate-500">Under this faculty across all branch batches.</p>
                  </div>
                  <div className="space-y-4 max-w-lg mx-auto">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold text-slate-700">Excellent Performance (&gt;80%)</span>
                        <span className="font-bold text-emerald-600">{selectedFaculty.studentPerf.excellent} Students</span>
                      </div>
                      <ProgressBar value={(selectedFaculty.studentPerf.excellent / selectedFaculty.studentsCount) * 100 || 0} colorClass="bg-emerald-500" />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold text-slate-700">Good Performance (60-79%)</span>
                        <span className="font-bold text-blue-500">{selectedFaculty.studentPerf.good} Students</span>
                      </div>
                      <ProgressBar value={(selectedFaculty.studentPerf.good / selectedFaculty.studentsCount) * 100 || 0} colorClass="bg-blue-500" />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold text-slate-700">Needs Improvement (40-59%)</span>
                        <span className="font-bold text-orange-500">{selectedFaculty.studentPerf.needsImp} Students</span>
                      </div>
                      <ProgressBar value={(selectedFaculty.studentPerf.needsImp / selectedFaculty.studentsCount) * 100 || 0} colorClass="bg-orange-400" />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold text-slate-700">At Risk (&lt;40%)</span>
                        <span className="font-bold text-red-600">{selectedFaculty.studentPerf.atRisk} Students</span>
                      </div>
                      <ProgressBar value={(selectedFaculty.studentPerf.atRisk / selectedFaculty.studentsCount) * 100 || 0} colorClass="bg-red-500" />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Weekly Schedule */}
              {activePanelTab === "Weekly Schedule" && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Weekly Class Timetable</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(selectedFaculty.schedule).map(([day, slots]: [string, any]) => (
                      <div key={day} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1769AA] flex items-center justify-center font-bold text-xs">
                            {day.slice(0, 3)}
                          </div>
                          <h4 className="text-xs font-bold text-slate-800">{day}</h4>
                        </div>
                        <div className="space-y-2">
                          {slots.map((s: any, i: number) => (
                            <div key={i} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs flex justify-between items-center">
                              <span className="font-medium text-slate-700">{s.time}</span>
                              <span className="font-bold text-[#1769AA] bg-blue-50 px-2 py-0.5 rounded">{s.batch}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 5: Overview & Profile */}
              {activePanelTab === "Overview & Profile" && (
                <div className="space-y-6">
                  <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">Faculty Information</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                      <div>
                        <p className="text-slate-400 font-medium">Branch Center</p>
                        <p className="font-bold text-slate-800 mt-1">{selectedFaculty.branch}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-medium">Specialization</p>
                        <p className="font-bold text-slate-800 mt-1">{selectedFaculty.specialization}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-medium">Total Experience</p>
                        <p className="font-bold text-slate-800 mt-1">{selectedFaculty.experience}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-medium">Date of Joining</p>
                        <p className="font-bold text-slate-800 mt-1">{selectedFaculty.joinDate}</p>
                      </div>
                    </div>
                  </div>

                  {/* Workload */}
                  <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <BarChart3 className="h-4 w-4 text-[#1769AA]" /> Workload Intelligence
                    </h4>
                    {(() => {
                      const state = getWorkloadState(selectedFaculty.workloadHrs);
                      return (
                        <div>
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="font-semibold text-slate-700">Weekly Teaching Load</span>
                            <span className={`font-bold ${state.text}`}>{selectedFaculty.workloadHrs} Hours ({state.label})</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden mb-1.5">
                            <div className={`h-full rounded-full ${state.color}`} style={{ width: `${state.pct}%` }} />
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                            <span>0 hrs</span>
                            <span>Optimal (20h)</span>
                            <span>Max (35h)</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Alerts */}
                  {selectedFaculty.alerts?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Faculty Insights & Alerts</h4>
                      {selectedFaculty.alerts.map((alert: any, i: number) => (
                        <div key={i} className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs font-medium ${
                          alert.type === 'warning' ? 'bg-orange-50 border-orange-200 text-orange-800' :
                          alert.type === 'danger' ? 'bg-red-50 border-red-200 text-red-800' :
                          'bg-emerald-50 border-emerald-200 text-emerald-800'
                        }`}>
                          {alert.type === 'warning' && <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5"/>}
                          {alert.type === 'danger' && <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5"/>}
                          {alert.type === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5"/>}
                          {alert.text}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-white shrink-0 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Faculty Member since {selectedFaculty.joinDate}</span>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => setSelectedFaculty(null)} className="text-xs h-9 px-4 font-semibold text-slate-700 border-slate-200 hover:bg-slate-50">
                  Close
                </Button>
                <Button className="text-xs h-9 px-4 font-semibold bg-[#1769AA] hover:bg-[#125890] text-white">
                  Message Faculty
                </Button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
