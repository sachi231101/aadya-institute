import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  UserCheck,
  GraduationCap,
  UserMinus,
  CalendarDays,
  Wallet,
  AlertTriangle,
  Library,
  Search,
  Download,
  Plus,
  MoreVertical,
  X,
  Mail,
  Phone,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Circle,
  AlertCircle
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useBranchStore } from "@/store/branch.store";
import { useBranches } from "@/hooks/useBranches";

// ─── MOCK DATA WITH BRANCHES ─────────────────────────────────────────────

const STUDENTS_MOCK = [
  { id: "ST001", name: "Rahul Kumar", email: "rahul.kumar@gmail.com", phone: "9876543210", course: "Digital Marketing", batch: "DM-01", faculty: "Priya", branch: "Bengaluru Central", branchId: "b-central", attendance: 92, progress: 78, fees: { total: 35000, paid: 35000, pending: 0, status: "Paid" }, status: "Active", avatar: "https://i.pravatar.cc/150?u=rahul", joinDate: "10 June 2026", counsellor: "Sneha Reddy" },
  { id: "ST002", name: "Anjali Sharma", email: "anjali.sharma@gmail.com", phone: "9123456780", course: "Graphic Design", batch: "GD-02", faculty: "Arjun", branch: "Malleswaram", branchId: "b-malleswaram", attendance: 84, progress: 65, fees: { total: 40000, paid: 35000, pending: 5000, status: "Pending" }, status: "Active", avatar: "https://i.pravatar.cc/150?u=anjali", joinDate: "15 June 2026", counsellor: "Arjun" },
  { id: "ST003", name: "Vikram Rao", email: "vikram.rao@gmail.com", phone: "9988776655", course: "Tally Prime", batch: "TP-01", faculty: "Sneha", branch: "Bengaluru Central", branchId: "b-central", attendance: 96, progress: 91, fees: { total: 25000, paid: 25000, pending: 0, status: "Paid" }, status: "Active", avatar: "https://i.pravatar.cc/150?u=vikram", joinDate: "01 July 2026", counsellor: "Priya" },
  { id: "ST004", name: "Karan Singh", email: "karan.singh@gmail.com", phone: "8899001122", course: "Python Programming", batch: "PY-03", faculty: "Rahul", branch: "Ramamurthy Nagar", branchId: "b-ramamurthy", attendance: 61, progress: 48, fees: { total: 45000, paid: 37000, pending: 8000, status: "Pending" }, status: "At Risk", avatar: "https://i.pravatar.cc/150?u=karan", joinDate: "20 May 2026", counsellor: "Sneha Reddy" },
  { id: "ST005", name: "Sneha Iyer", email: "sneha.iyer@gmail.com", phone: "9871234560", course: "Web Design", batch: "WD-01", faculty: "Priya", branch: "Bengaluru Central", branchId: "b-central", attendance: 88, progress: 72, fees: { total: 30000, paid: 30000, pending: 0, status: "Paid" }, status: "Active", avatar: "https://i.pravatar.cc/150?u=snehaiyer", joinDate: "12 June 2026", counsellor: "Rahul" },
  { id: "ST006", name: "Mohammed Ali", email: "ali.mohammed@gmail.com", phone: "8899776655", course: "Digital Marketing", batch: "DM-02", faculty: "Sneha", branch: "Malleswaram", branchId: "b-malleswaram", attendance: 75, progress: 60, fees: { total: 35000, paid: 31500, pending: 3500, status: "Pending" }, status: "Active", avatar: "https://i.pravatar.cc/150?u=ali", joinDate: "05 July 2026", counsellor: "Sneha Reddy" },
  { id: "ST007", name: "Pooja Patel", email: "pooja.patel@gmail.com", phone: "7788990011", course: "Graphic Design", batch: "GD-01", faculty: "Arjun", branch: "Bengaluru Central", branchId: "b-central", attendance: 52, progress: 30, fees: { total: 40000, paid: 33000, pending: 7000, status: "Pending" }, status: "At Risk", avatar: "https://i.pravatar.cc/150?u=pooja", joinDate: "22 May 2026", counsellor: "Priya" },
  { id: "ST008", name: "Rakesh Babu", email: "rakesh.babu@gmail.com", phone: "9988001122", course: "Tally Prime", batch: "TP-02", faculty: "Rahul", branch: "Bengaluru Central", branchId: "b-central", attendance: 90, progress: 85, fees: { total: 25000, paid: 25000, pending: 0, status: "Paid" }, status: "Active", avatar: "https://i.pravatar.cc/150?u=rakesh", joinDate: "10 June 2026", counsellor: "Arjun" },
];

const MODULE_PROGRESS = [
  { id: 1, name: "Introduction", status: "Completed" },
  { id: 2, name: "Fundamentals", status: "Completed" },
  { id: 3, name: "SEO", status: "Completed" },
  { id: 4, name: "Social Media Marketing", status: "Completed" },
  { id: 5, name: "Google Ads", status: "In Progress" },
  { id: 6, name: "Analytics", status: "Pending" },
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
    case "At Risk": return "bg-red-100 text-red-700";
    case "Completed": return "bg-purple-100 text-purple-700";
    case "Dropped": return "bg-slate-200 text-slate-700";
    default: return "bg-slate-100 text-slate-600";
  }
};

const getAttendanceColor = (att: number) => {
  if (att >= 85) return "bg-emerald-500";
  if (att >= 70) return "bg-orange-500";
  return "bg-red-500";
};

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────

export const AllStudents: React.FC = () => {
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState("All Students");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourseFilter, setSelectedCourseFilter] = useState("All Courses");
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  const { selectedBranchId, setSelectedBranchId } = useBranchStore();
  const { data: branchesResponse } = useBranches({ limit: 100 });
  const branches = branchesResponse?.data || [];

  // Filter students by selected branch, search, and tabs
  const filteredStudents = STUDENTS_MOCK.filter(student => {
    // Branch Filter (respects global branch switcher or page filter)
    const matchesBranch = 
      selectedBranchId === "ALL" || 
      student.branchId === selectedBranchId || 
      branches.find(b => b.id === selectedBranchId)?.name.toLowerCase().includes(student.branch.toLowerCase());

    // Search Filter
    const matchesSearch = 
      !searchTerm ||
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.phone.includes(searchTerm);

    // Course Filter
    const matchesCourse = 
      selectedCourseFilter === "All Courses" || 
      student.course === selectedCourseFilter;

    // Status Tab Filter
    const matchesTab = 
      selectedTab === "All Students" ||
      (selectedTab === "Active" && student.status === "Active") ||
      (selectedTab === "At Risk" && student.status === "At Risk") ||
      (selectedTab === "Completed" && student.status === "Completed") ||
      (selectedTab === "Dropped" && student.status === "Dropped");

    return matchesBranch && matchesSearch && matchesCourse && matchesTab;
  });

  // Dynamic KPI counts based on branch selection
  const branchStudents = STUDENTS_MOCK.filter(s => 
    selectedBranchId === "ALL" || 
    s.branchId === selectedBranchId || 
    branches.find(b => b.id === selectedBranchId)?.name.toLowerCase().includes(s.branch.toLowerCase())
  );

  const kpis = {
    total: branchStudents.length,
    active: branchStudents.filter(s => s.status === "Active").length,
    atRisk: branchStudents.filter(s => s.status === "At Risk").length,
    avgAttendance: branchStudents.length 
      ? Math.round(branchStudents.reduce((acc, s) => acc + s.attendance, 0) / branchStudents.length)
      : 86,
    pendingFees: branchStudents.reduce((acc, s) => acc + s.fees.pending, 0)
  };

  const tabs = [
    { name: "All Students", count: branchStudents.length, color: "text-[#1769AA]" },
    { name: "Active", count: branchStudents.filter(s => s.status === "Active").length, color: "text-slate-600" },
    { name: "At Risk", count: branchStudents.filter(s => s.status === "At Risk").length, color: "text-red-500" },
    { name: "Completed", count: 0, color: "text-purple-600" },
    { name: "Dropped", count: 0, color: "text-slate-600" },
  ];

  return (
    <div className="p-6 max-w-[1600px] mx-auto bg-[#f8fafc] min-h-screen relative overflow-x-hidden">
      
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-[#1769AA]" />
            Student Tracker
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Monitor student progress, attendance, academic performance and fees status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" className="text-slate-700 border-slate-300 font-medium bg-white">
            <Download className="h-4 w-4 mr-2 text-slate-500" /> Export Report
          </Button>
          <Button className="bg-[#1769AA] hover:bg-[#125890] text-white font-medium shadow-sm" onClick={() => navigate("../add")}>
            <Plus className="h-4 w-4 mr-2" /> Add Student
          </Button>
        </div>
      </div>

      {/* 2. KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Active Students", value: kpis.active, sub: `${Math.round((kpis.active / (kpis.total || 1)) * 100)}% Active`, icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Average Attendance", value: `${kpis.avgAttendance}%`, sub: "This Month", icon: CalendarDays, color: "text-orange-500", bg: "bg-orange-50" },
          { label: "Fees Pending", value: `₹${kpis.pendingFees.toLocaleString()}`, sub: `${branchStudents.filter(s => s.fees.pending > 0).length} Students`, icon: Wallet, color: "text-amber-500", bg: "bg-amber-50" },
          { label: "Students At Risk", value: kpis.atRisk, sub: `${Math.round((kpis.atRisk / (kpis.total || 1)) * 100)}% of total`, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
        ].map((kpi, idx) => (
          <Card key={idx} className="border-slate-200 shadow-sm">
            <CardContent className="p-3">
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className={`p-1 rounded-md ${kpi.bg}`}>
                    <kpi.icon className={`h-3 w-3 ${kpi.color}`} />
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{kpi.label}</p>
                </div>
                <h3 className="text-xl font-black text-slate-800">{kpi.value}</h3>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">{kpi.sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 3. SEARCH, FILTERS & TABS */}
      <Card className="border-slate-200 shadow-sm mb-4">
        <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search student by name, ID, email or phone..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1769AA]/20 focus:border-[#1769AA] transition-all"
            />
          </div>
          <div className="flex items-center gap-3 w-full lg:w-auto">
            {/* Branch Switcher / Filter */}
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

            <select 
              value={selectedCourseFilter}
              onChange={(e) => setSelectedCourseFilter(e.target.value)}
              className="text-sm border border-slate-200 rounded-md px-3 py-2 text-slate-600 bg-white focus:outline-none focus:border-[#1769AA]"
            >
              <option value="All Courses">All Courses</option>
              <option value="Digital Marketing">Digital Marketing</option>
              <option value="Graphic Design">Graphic Design</option>
              <option value="Tally Prime">Tally Prime</option>
              <option value="Python Programming">Python Programming</option>
              <option value="Web Design">Web Design</option>
            </select>
          </div>
        </div>
        
        <div className="px-4 py-2 flex items-center gap-6 overflow-x-auto">
          {tabs.map(tab => (
            <button 
              key={tab.name}
              onClick={() => setSelectedTab(tab.name)}
              className={`text-sm font-semibold py-2 transition-colors whitespace-nowrap ${
                selectedTab === tab.name 
                  ? "text-[#1769AA]" 
                  : tab.color === "text-[#1769AA]" ? "text-slate-600 hover:text-slate-900" : `${tab.color} opacity-80 hover:opacity-100`
              }`}
            >
              {selectedTab === tab.name ? (
                <span className="bg-blue-50 px-3 py-1.5 rounded-md">{tab.name} ({tab.count})</span>
              ) : (
                <span>{tab.name} ({tab.count})</span>
              )}
            </button>
          ))}
        </div>
      </Card>

      {/* 4. STUDENT DIRECTORY TABLE */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px] whitespace-nowrap">
            <thead className="bg-slate-50/50 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase">
              <tr>
                <th className="px-5 py-4">Student</th>
                <th className="px-4 py-4">Student ID</th>
                <th className="px-4 py-4">Course</th>
                <th className="px-4 py-4">Batch</th>
                <th className="px-4 py-4">Faculty</th>
                <th className="px-4 py-4">Attendance</th>
                <th className="px-4 py-4">Progress</th>
                <th className="px-4 py-4">Fees</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-5 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <img src={student.avatar} alt={student.name} className="w-8 h-8 rounded-full border border-slate-200" />
                        <div>
                          <p className="font-semibold text-slate-900 text-[13px]">{student.name}</p>
                          <p className="text-[10px] text-slate-500 flex items-center gap-1.5">
                            <span>{student.email}</span>
                            <span>•</span>
                            <span className="text-[#1769AA] font-medium">{student.branch}</span>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-600">{student.id}</td>
                    <td className="px-4 py-3 font-medium text-slate-800 text-[12px]">{student.course}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800 text-[12px]">{student.batch}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[9px] font-bold">
                          {student.faculty[0]}
                        </div>
                        <span className="font-medium text-slate-700 text-[12px]">{student.faculty}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 w-32">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-slate-700">{student.attendance}%</span>
                      </div>
                      <ProgressBar value={student.attendance} colorClass={getAttendanceColor(student.attendance)} />
                    </td>
                    <td className="px-4 py-3 w-32">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-slate-700">{student.progress}%</span>
                      </div>
                      <ProgressBar value={student.progress} colorClass="bg-blue-600" />
                    </td>
                    <td className="px-4 py-3">
                      {student.fees.status === "Paid" ? (
                        <span className="text-[10px] font-bold text-emerald-600">Paid</span>
                      ) : (
                        <div>
                          <p className="text-[11px] font-bold text-orange-600">₹{student.fees.pending.toLocaleString()} <br/><span className="text-[9px] font-semibold">Pending</span></p>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-sm ${getStatusColor(student.status)}`}>
                        {student.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-7 px-2.5 text-xs border-[#1769AA]/30 text-[#1769AA] hover:bg-[#1769AA]/5"
                          onClick={() => navigate(`/admin/students/performance?studentId=${student.id}`)}
                        >
                          View
                        </Button>
                        <button className="text-slate-400 hover:text-slate-600"><MoreVertical className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="px-5 py-12 text-center text-slate-400 text-sm">
                    No students found for the selected branch / filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-medium">Showing {filteredStudents.length} of {branchStudents.length} students</span>
        </div>
      </Card>

      {/* 5. RIGHT-SIDE DETAILS DRAWER (Slide-Over) */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={() => setSelectedStudent(null)} />
          
          {/* Panel */}
          <div className="absolute inset-y-0 right-0 max-w-md w-full flex">
            <div className="w-full h-full bg-white shadow-2xl flex flex-col overflow-y-auto animate-in slide-in-from-right duration-300">
              
              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-100 relative bg-slate-50/50">
                <button onClick={() => setSelectedStudent(null)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
                  <X className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-4 mt-2">
                  <img src={selectedStudent.avatar} alt="Student" className="w-16 h-16 rounded-full border-2 border-white shadow-sm object-cover" />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-xl font-bold text-slate-900">{selectedStudent.name}</h2>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm ${getStatusColor(selectedStudent.status)}`}>
                        {selectedStudent.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mb-1">{selectedStudent.id} · {selectedStudent.phone}</p>
                    <a href={`mailto:${selectedStudent.email}`} className="text-xs text-[#1769AA] hover:underline flex items-center gap-1">
                      {selectedStudent.email}
                    </a>
                  </div>
                </div>
              </div>

              {/* Drawer Tabs */}
              <div className="flex items-center px-6 border-b border-slate-100 bg-white">
                {["Overview", "Attendance", "Progress", "Fees", "More"].map((t, i) => (
                  <button key={t} className={`px-4 py-3 text-[13px] font-bold border-b-2 transition-colors ${i === 0 ? "border-[#1769AA] text-[#1769AA]" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"}`}>
                    {t}
                  </button>
                ))}
              </div>

              {/* Drawer Content */}
              <div className="flex-1 p-6 space-y-8 bg-white">
                
                {/* Overview Section */}
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2 py-2 border-b border-slate-50 border-dashed">
                    <div className="col-span-1 flex items-center gap-2 text-xs text-slate-500 font-medium"><GraduationCap className="h-3.5 w-3.5"/> Course</div>
                    <div className="col-span-2 text-[13px] font-semibold text-slate-800 text-right">{selectedStudent.course}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 py-2 border-b border-slate-50 border-dashed">
                    <div className="col-span-1 flex items-center gap-2 text-xs text-slate-500 font-medium"><Library className="h-3.5 w-3.5"/> Batch</div>
                    <div className="col-span-2 text-[13px] font-semibold text-slate-800 text-right">{selectedStudent.batch} (10:00 AM)</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 py-2 border-b border-slate-50 border-dashed">
                    <div className="col-span-1 flex items-center gap-2 text-xs text-slate-500 font-medium"><Users className="h-3.5 w-3.5"/> Faculty</div>
                    <div className="col-span-2 text-[13px] font-semibold text-slate-800 text-right">{selectedStudent.faculty} Sharma</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 py-2 border-b border-slate-50 border-dashed">
                    <div className="col-span-1 flex items-center gap-2 text-xs text-slate-500 font-medium"><Phone className="h-3.5 w-3.5"/> Counsellor</div>
                    <div className="col-span-2 text-[13px] font-semibold text-slate-800 text-right">{selectedStudent.counsellor}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 py-2 border-b border-slate-50 border-dashed">
                    <div className="col-span-1 flex items-center gap-2 text-xs text-slate-500 font-medium"><Calendar className="h-3.5 w-3.5"/> Joined On</div>
                    <div className="col-span-2 text-[13px] font-semibold text-slate-800 text-right">{selectedStudent.joinDate}</div>
                  </div>
                </div>

                {/* Attendance Section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-slate-900">Attendance</h3>
                    <select className="text-[10px] border border-slate-200 rounded px-1.5 py-0.5 text-slate-600 bg-white">
                      <option>This Month</option>
                    </select>
                  </div>
                  <div className="mb-1.5">
                    <span className={`text-2xl font-black ${selectedStudent.attendance >= 85 ? "text-emerald-600" : selectedStudent.attendance >= 70 ? "text-orange-500" : "text-red-600"}`}>{selectedStudent.attendance}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div className={`h-2.5 rounded-full ${getAttendanceColor(selectedStudent.attendance)}`} style={{ width: `${selectedStudent.attendance}%` }} />
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-1.5 text-right">23 / 25 Days Present</p>
                </div>

                {/* Academic Progress Section */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-2">Academic Progress</h3>
                  <div className="mb-1.5">
                    <span className="text-2xl font-black text-[#1769AA]">{selectedStudent.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div className="h-2.5 rounded-full bg-blue-600" style={{ width: `${selectedStudent.progress}%` }} />
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-1.5 text-right mb-4">14 / 18 Modules Completed</p>
                  
                  <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-3 mt-6">Module Progress</h4>
                  <div className="space-y-3">
                    {MODULE_PROGRESS.map((mod) => (
                      <div key={mod.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          {mod.status === "Completed" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                          {mod.status === "In Progress" && <Circle className="h-4 w-4 text-orange-400 fill-orange-400" />}
                          {mod.status === "Pending" && <Circle className="h-4 w-4 text-slate-300" />}
                          <span className={`font-medium text-[13px] ${mod.status === "Pending" ? "text-slate-500" : "text-slate-800"}`}>Module {mod.id} - {mod.name}</span>
                        </div>
                        <span className={`text-[10px] font-bold ${mod.status === "Completed" ? "text-emerald-600" : mod.status === "In Progress" ? "text-orange-500" : "text-slate-400"}`}>
                          {mod.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Fees Section */}
                <div className="bg-slate-50/80 p-5 rounded-xl border border-slate-100 mt-8">
                  <h3 className="text-sm font-bold text-slate-800 mb-4">Fees Summary</h3>
                  <div className="flex items-center justify-between text-center">
                    <div>
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Total Fees</p>
                      <p className="text-base font-bold text-slate-800 mt-1">₹{selectedStudent.fees.total.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Paid</p>
                      <p className="text-base font-bold text-emerald-600 mt-1">₹{selectedStudent.fees.paid.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Pending</p>
                      <p className={`text-base font-bold mt-1 ${selectedStudent.fees.pending > 0 ? "text-red-500" : "text-slate-800"}`}>
                        ₹{selectedStudent.fees.pending.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
