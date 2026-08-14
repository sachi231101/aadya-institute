import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, UserCheck, GraduationCap, Clock, AlertTriangle, BookOpen, Search, Download, Plus,
  MoreVertical, X, Mail, Phone, Calendar, CheckCircle2, Circle, AlertCircle, FileText, Bell,
  CalendarDays, BarChart3, TrendingUp, TrendingDown, BookMarked, MonitorPlay, Star
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";

// ─── MOCK DATA ────────────────────────────────────────────────────────────

const KPI_DATA = {
  total: { count: 12, sub: "All Branches" },
  active: { count: 10, sub: "83.3%" },
  onLeave: { count: 1, sub: "8.3%" },
  inactive: { count: 1, sub: "8.3%" },
  totalStudents: { count: 284, sub: "Under Faculty" },
  activeBatches: { count: 18, sub: "Ongoing" },
  avgAttendance: { count: "91%", sub: "This Month" },
  avgPerformance: { count: "84%", sub: "Academic Avg" }
};

const ATTENDANCE_TREND = [
  { name: 'Mar', val: 84 }, { name: 'Apr', val: 91 }, { name: 'May', val: 87 },
  { name: 'Jun', val: 93 }, { name: 'Jul', val: 89 }, { name: 'Aug', val: 94 }
];

const MOCK_FACULTY = [
  {
    id: "FA001", name: "HM Adithya", email: "adithyahm0@gmail.com", phone: "8217312051", 
    specialization: "MERN Full Stack", branch: "Main Branch", 
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
    specialization: "Digital Marketing", branch: "Ramamurthy Nagara", 
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
    alerts: [ { type: "success", text: "MERN-01 is 60% complete." } ]
  },
  {
    id: "FA003", name: "Rahul Verma", email: "rahul.verma@gmail.com", phone: "9988776655", 
    specialization: "Python Programming", branch: "Bengaluru Central", 
    batchesCount: 2, studentsCount: 45, attendance: 86, workloadHrs: 16, status: "On Leave",
    avatar: "https://i.pravatar.cc/150?u=rahul", joinDate: "20 Mar 2023", experience: "4.0 Years",
    rating: 3.9,
    feedback: [],
    batches: [], studentPerf: { excellent: 10, good: 20, needsImp: 10, atRisk: 5 },
    schedule: {}, alerts: [ { type: "warning", text: "Currently on leave until Aug 25th." } ]
  },
  {
    id: "FA004", name: "Sneha Reddy", email: "sneha.reddy@gmail.com", phone: "9123456780", 
    specialization: "UI/UX Design", branch: "Main Branch", 
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
    specialization: "Graphic Design", branch: "Ramamurthy Nagara", 
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

const getWorkloadState = (hrs: number) => {
  if (hrs < 15) return { label: "Low Workload", color: "bg-blue-500", text: "text-blue-600", pct: Math.min((hrs/35)*100, 100) };
  if (hrs <= 24) return { label: "Balanced", color: "bg-emerald-500", text: "text-emerald-600", pct: Math.min((hrs/35)*100, 100) };
  if (hrs <= 30) return { label: "High Workload", color: "bg-orange-500", text: "text-orange-600", pct: Math.min((hrs/35)*100, 100) };
  return { label: "Overloaded", color: "bg-red-500", text: "text-red-600", pct: 100 };
};

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────

export const AllFaculty: React.FC = () => {
  const navigate = useNavigate();
  const [selectedFilterTab, setSelectedFilterTab] = useState("All");
  const [selectedFaculty, setSelectedFaculty] = useState<any | null>(null);
  const [activePanelTab, setActivePanelTab] = useState("Overview");

  const filterTabs = [
    { name: "All", count: 12, color: "text-[#1769AA]" },
    { name: "Active", count: 10, color: "text-emerald-600" },
    { name: "On Leave", count: 1, color: "text-amber-500" },
    { name: "High Workload", count: 2, color: "text-orange-500" },
    { name: "Needs Attention", count: 1, color: "text-red-500" },
  ];

  return (
    <div className="p-6 w-full mx-auto bg-[#f8fafc] min-h-screen relative overflow-x-hidden flex gap-6">
      
      {/* ─── LEFT SIDE (Table) ─── */}
      <div className={`transition-all duration-300 ease-in-out ${selectedFaculty ? 'w-[70%]' : 'w-full'}`}>
        
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
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3 mb-6">
          {[
            { label: "Total Faculty", value: KPI_DATA.total.count, sub: KPI_DATA.total.sub, icon: Users, color: "text-[#1769AA]", bg: "bg-blue-50" },
            { label: "Active Faculty", value: KPI_DATA.active.count, sub: KPI_DATA.active.sub, icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "On Leave", value: KPI_DATA.onLeave.count, sub: KPI_DATA.onLeave.sub, icon: Clock, color: "text-amber-500", bg: "bg-amber-50" },
            { label: "Inactive", value: KPI_DATA.inactive.count, sub: KPI_DATA.inactive.sub, icon: AlertCircle, color: "text-slate-500", bg: "bg-slate-100" },
            { label: "Total Students", value: KPI_DATA.totalStudents.count, sub: KPI_DATA.totalStudents.sub, icon: GraduationCap, color: "text-purple-600", bg: "bg-purple-50" },
            { label: "Active Batches", value: KPI_DATA.activeBatches.count, sub: KPI_DATA.activeBatches.sub, icon: BookOpen, color: "text-[#1769AA]", bg: "bg-blue-50" },
            { label: "Faculty Attendance", value: KPI_DATA.avgAttendance.count, sub: KPI_DATA.avgAttendance.sub, icon: CalendarDays, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Student Perf", value: KPI_DATA.avgPerformance.count, sub: KPI_DATA.avgPerformance.sub, icon: TrendingUp, color: "text-[#1769AA]", bg: "bg-blue-50" },
          ].map((kpi, idx) => (
            <Card key={idx} className="border-slate-200 shadow-sm">
              <CardContent className="p-3">
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className={`p-1 rounded-md ${kpi.bg}`}>
                      <kpi.icon className={`h-3 w-3 ${kpi.color}`} />
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide truncate">{kpi.label}</p>
                  </div>
                  <h3 className="text-xl font-black text-slate-800">{kpi.value}</h3>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">{kpi.sub}</p>
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
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1769AA]/20 focus:border-[#1769AA] transition-all"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select className="text-sm border border-slate-200 rounded-md px-3 py-2 text-slate-600 bg-white focus:outline-none focus:border-[#1769AA]">
                <option>All Branches</option>
                <option>Main Branch</option>
                <option>Ramamurthy Nagara</option>
              </select>
              <select className="text-sm border border-slate-200 rounded-md px-3 py-2 text-slate-600 bg-white focus:outline-none focus:border-[#1769AA]">
                <option>Specialization</option>
              </select>
              <select className="text-sm border border-slate-200 rounded-md px-3 py-2 text-slate-600 bg-white focus:outline-none focus:border-[#1769AA]">
                <option>Workload</option>
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
                {MOCK_FACULTY.map((fac) => (
                  <tr 
                    key={fac.id} 
                    onClick={() => {
                      setSelectedFaculty(fac);
                      setActivePanelTab("Overview"); // Reset tab on selection
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
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-medium">Showing 1 to 5 of 12 faculty</span>
          </div>
        </Card>
      </div>

      {/* ─── RIGHT SIDE (Intelligence Panel) ─── */}
      {selectedFaculty && (
        <div className="w-[30%] min-w-[380px] bg-white border border-slate-200 rounded-xl shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 relative h-[calc(100vh-48px)] sticky top-6">
          
          {/* Header */}
          <div className="p-5 border-b border-slate-100 relative bg-slate-50/50 shrink-0">
            <button onClick={() => setSelectedFaculty(null)} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-200 transition-colors">
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-start gap-4 mt-1">
              <img src={selectedFaculty.avatar} alt="Faculty" className="w-16 h-16 rounded-xl border border-slate-200 shadow-sm object-cover" />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-bold text-slate-900 leading-tight">{selectedFaculty.name}</h2>
                  {selectedFaculty.rating > 0 && (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 ml-1">
                      <Star className="h-3 w-3 fill-current" /> {selectedFaculty.rating}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-mono font-bold text-slate-500">{selectedFaculty.id}</span>
                  <span className="text-[10px] text-slate-300">•</span>
                  <span className={`text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 ${selectedFaculty.status === 'Active' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    <Circle className={`h-2 w-2 fill-current ${selectedFaculty.status === 'Active' ? 'text-emerald-500' : 'text-amber-500'}`} />
                    {selectedFaculty.status}
                  </span>
                </div>
                <div className="flex flex-col gap-1 mt-2 text-xs text-slate-500 font-medium">
                  <a href={`mailto:${selectedFaculty.email}`} className="hover:text-[#1769AA] flex items-center gap-2"><Mail className="h-3.5 w-3.5"/> {selectedFaculty.email}</a>
                  <span className="flex items-center gap-2"><Phone className="h-3.5 w-3.5"/> +91 {selectedFaculty.phone}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Snapshot Cards */}
          <div className="grid grid-cols-4 divide-x divide-slate-100 border-b border-slate-100 shrink-0 bg-white">
            <div className="p-3 text-center">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Batches</p>
              <p className="text-lg font-black text-slate-800">{selectedFaculty.batchesCount}</p>
            </div>
            <div className="p-3 text-center">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Students</p>
              <p className="text-lg font-black text-slate-800">{selectedFaculty.studentsCount}</p>
            </div>
            <div className="p-3 text-center">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Hrs/Wk</p>
              <p className="text-lg font-black text-[#1769AA]">{selectedFaculty.workloadHrs}</p>
            </div>
            <div className="p-3 text-center">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Attend.</p>
              <p className="text-lg font-black text-emerald-600">{selectedFaculty.attendance}%</p>
            </div>
          </div>

          {/* Panel Tabs */}
          <div className="flex items-center px-4 border-b border-slate-100 bg-white shrink-0 overflow-x-auto hide-scrollbar">
            {["Overview", "Batches", "Students", "Attendance", "Schedule", "Performance"].map((t) => (
              <button 
                key={t} 
                onClick={() => setActivePanelTab(t)}
                className={`px-3 py-3 text-[12px] font-bold border-b-2 transition-colors whitespace-nowrap ${activePanelTab === t ? "border-[#1769AA] text-[#1769AA]" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"}`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Panel Content (Scrollable) */}
          <div className="flex-1 overflow-y-auto bg-slate-50/30 p-5 space-y-6">
            
            {activePanelTab === "Overview" && (
              <>
                {/* Basic Info */}
                <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1 text-[11px] text-slate-500 font-medium">Branch</div>
                    <div className="col-span-2 text-[12px] font-semibold text-slate-800">{selectedFaculty.branch}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1 text-[11px] text-slate-500 font-medium">Specialization</div>
                    <div className="col-span-2 text-[12px] font-semibold text-slate-800">{selectedFaculty.specialization}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1 text-[11px] text-slate-500 font-medium">Experience</div>
                    <div className="col-span-2 text-[12px] font-semibold text-slate-800">{selectedFaculty.experience}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1 text-[11px] text-slate-500 font-medium">Joined</div>
                    <div className="col-span-2 text-[12px] font-semibold text-slate-800">{selectedFaculty.joinDate}</div>
                  </div>
                </div>

                {/* Admin Intelligence / Alerts */}
                {selectedFaculty.alerts.length > 0 && (
                  <div>
                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Bell className="h-3.5 w-3.5"/> Faculty Insights</h3>
                    <div className="space-y-2.5">
                      {selectedFaculty.alerts.map((alert: any, i: number) => (
                        <div key={i} className={`p-3 rounded-lg border flex items-start gap-2.5 text-xs font-medium leading-relaxed
                          ${alert.type === 'warning' ? 'bg-orange-50 border-orange-100 text-orange-800' : 
                            alert.type === 'danger' ? 'bg-red-50 border-red-100 text-red-800' : 
                            'bg-emerald-50 border-emerald-100 text-emerald-800'}
                        `}>
                          {alert.type === 'warning' && <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5"/>}
                          {alert.type === 'danger' && <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5"/>}
                          {alert.type === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5"/>}
                          {alert.text}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Workload Indicator */}
                <div>
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5"/> Workload Intelligence</h3>
                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    {(() => {
                      const state = getWorkloadState(selectedFaculty.workloadHrs);
                      return (
                        <>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold text-slate-800">Workload</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-sm bg-slate-50 ${state.text}`}>{state.label}</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2.5 mb-2 overflow-hidden">
                            <div className={`h-2.5 rounded-full ${state.color}`} style={{ width: `${state.pct}%` }} />
                          </div>
                          <div className="flex items-center justify-between text-[10px] font-medium text-slate-400">
                            <span>0h</span>
                            <span>Avg (20h)</span>
                            <span>Max (35h)</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Attendance Trend */}
                <div>
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5"/> Monthly Attendance Trend</h3>
                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={ATTENDANCE_TREND} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                        <YAxis domain={[60, 100]} tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                        <Line type="monotone" dataKey="val" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}

            {activePanelTab === "Batches" && (
              <div className="space-y-4">
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><BookMarked className="h-3.5 w-3.5"/> Assigned Batches</h3>
                {selectedFaculty.batches.length > 0 ? selectedFaculty.batches.map((b: any) => (
                  <div key={b.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:border-[#1769AA]/30 transition-colors cursor-pointer group">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="text-sm font-bold text-[#1769AA] group-hover:underline">{b.id}</h4>
                        <p className="text-xs font-semibold text-slate-800 mt-0.5">{b.name}</p>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-sm ${b.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-purple-50 text-purple-600'}`}>
                        {b.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-y-2 mt-4 text-[11px]">
                      <div className="text-slate-500 font-medium"><Users className="h-3 w-3 inline mr-1"/> {b.students} Students</div>
                      <div className="text-slate-500 font-medium"><Clock className="h-3 w-3 inline mr-1"/> {b.time}</div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-50">
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="font-bold text-slate-600">Course Progress</span>
                        <span className="font-bold text-[#1769AA]">{b.progress}%</span>
                      </div>
                      <ProgressBar value={b.progress} colorClass="bg-blue-500" />
                    </div>
                  </div>
                )) : (
                  <p className="text-xs text-slate-500 italic">No active batches assigned.</p>
                )}
              </div>
            )}

            {activePanelTab === "Students" && (
              <div className="space-y-4">
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"><MonitorPlay className="h-3.5 w-3.5"/> Student Performance Snapshot</h3>
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                  <div className="text-center mb-5 pb-5 border-b border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Assigned Students</p>
                    <p className="text-3xl font-black text-slate-800">{selectedFaculty.studentsCount}</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-slate-700">Excellent Performance</span>
                        <span className="font-bold text-emerald-600">{selectedFaculty.studentPerf.excellent}</span>
                      </div>
                      <ProgressBar value={(selectedFaculty.studentPerf.excellent/selectedFaculty.studentsCount)*100 || 0} colorClass="bg-emerald-500" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-slate-700">Good Performance</span>
                        <span className="font-bold text-blue-500">{selectedFaculty.studentPerf.good}</span>
                      </div>
                      <ProgressBar value={(selectedFaculty.studentPerf.good/selectedFaculty.studentsCount)*100 || 0} colorClass="bg-blue-400" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-slate-700">Needs Improvement</span>
                        <span className="font-bold text-orange-500">{selectedFaculty.studentPerf.needsImp}</span>
                      </div>
                      <ProgressBar value={(selectedFaculty.studentPerf.needsImp/selectedFaculty.studentsCount)*100 || 0} colorClass="bg-orange-400" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-slate-700">At Risk</span>
                        <span className="font-bold text-red-600">{selectedFaculty.studentPerf.atRisk}</span>
                      </div>
                      <ProgressBar value={(selectedFaculty.studentPerf.atRisk/selectedFaculty.studentsCount)*100 || 0} colorClass="bg-red-500" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activePanelTab === "Schedule" && (
              <div className="space-y-4">
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5"/> Weekly Schedule</h3>
                {Object.keys(selectedFaculty.schedule).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(selectedFaculty.schedule).map(([day, slots]: [string, any]) => (
                      <div key={day} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#1769AA] flex items-center justify-center font-black text-sm shrink-0">
                          {day}
                        </div>
                        <div className="flex-1 space-y-2 mt-0.5">
                          {slots.map((s: any, i: number) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-700">{s.time}</span>
                              <span className="font-bold text-[#1769AA] bg-blue-50/50 px-2 py-0.5 rounded border border-blue-100">{s.batch}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No schedule available.</p>
                )}
              </div>
            )}

            {activePanelTab === "Performance" && (
              <div className="space-y-4">
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Star className="h-3.5 w-3.5"/> Student Ratings & Feedback</h3>
                {selectedFaculty.feedback?.length > 0 ? (
                  <div className="space-y-3">
                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-center justify-between shadow-sm">
                      <div>
                        <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Average Rating</p>
                        <p className="text-2xl font-black text-amber-600 mt-1">{selectedFaculty.rating} <span className="text-sm font-medium text-amber-500">/ 5.0</span></p>
                      </div>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`h-6 w-6 ${s <= selectedFaculty.rating ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"}`} />
                        ))}
                      </div>
                    </div>
                    {selectedFaculty.feedback.map((fb: any, i: number) => (
                      <div key={i} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800">{fb.student}</span>
                          <span className="text-[10px] text-slate-400 font-medium">{fb.date}</span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className={`h-3 w-3 ${s <= fb.rating ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"}`} />
                          ))}
                        </div>
                        <p className="text-xs text-slate-600 italic leading-relaxed">"{fb.text}"</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No feedback available.</p>
                )}
              </div>
            )}

            {/* Other tabs placeholder */}
            {["Attendance"].includes(activePanelTab) && (
              <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm text-center text-slate-500 text-xs italic">
                Detailed {activePanelTab.toLowerCase()} reports will be populated here.
              </div>
            )}

          </div>

          {/* Quick Actions (Bottom Fixed) */}
          <div className="p-4 border-t border-slate-100 bg-white shrink-0 grid grid-cols-3 gap-2">
            <Button variant="outline" onClick={() => setSelectedFaculty(null)} className="text-xs h-9 font-semibold text-slate-600 border-slate-200 hover:bg-slate-50">Cancel</Button>
            <Button variant="outline" className="text-xs h-9 font-semibold text-[#1769AA] border-[#1769AA]/30 hover:bg-blue-50">Profile</Button>
            <Button className="text-xs h-9 font-semibold bg-[#1769AA] hover:bg-[#125890]">Message</Button>
          </div>

        </div>
      )}

    </div>
  );
};
