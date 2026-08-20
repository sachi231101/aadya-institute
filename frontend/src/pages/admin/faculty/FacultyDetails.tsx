import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Mail,
  Phone,
  Award,
  BookOpen,
  Clock,
  UserCheck,
  MapPin,
  Loader2,
  AlertCircle,
  Star,
  Calendar,
  TrendingUp,
  MonitorPlay,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  MessageSquare,
  Users
} from "lucide-react";
import { useFacultyMember, useFacultyCourses, useFacultyAttendance } from "../../../hooks/useFaculty";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from "recharts";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const ATTENDANCE_TREND = [
  { name: "Mar", val: 84 },
  { name: "Apr", val: 91 },
  { name: "May", val: 87 },
  { name: "Jun", val: 93 },
  { name: "Jul", val: 89 },
  { name: "Aug", val: 94 },
];

const MOCK_FACULTY_DETAILS: Record<string, any> = {
  FA001: {
    id: "FA001",
    name: "HM Adithya",
    email: "adithyahm0@gmail.com",
    phone: "8217312051",
    specialization: "MERN Full Stack",
    branch: "Bengaluru Central",
    batchesCount: 4,
    studentsCount: 86,
    attendance: 88,
    workloadHrs: 27,
    status: "Active",
    avatar: "https://i.pravatar.cc/150?u=adithya",
    joinDate: "12 June 2024",
    experience: "3.8 Years",
    rating: 4.8,
    feedback: [
      { student: "Rahul K.", text: "Excellent teaching style, explains complex React concepts very well.", rating: 5, date: "10 Aug 2026" },
      { student: "Sneha M.", text: "Very helpful during doubt sessions.", rating: 4, date: "05 Aug 2026" },
      { student: "Ankit P.", text: "Good pacing, but sometimes goes a bit fast.", rating: 4, date: "22 Jul 2026" },
    ],
    batches: [
      { id: "MERN-01", name: "MERN Full Stack", students: 24, status: "Active", progress: 72, time: "10:00 AM" },
      { id: "MERN-02", name: "MERN Full Stack", students: 18, status: "Active", progress: 45, time: "02:00 PM" },
      { id: "JS-03", name: "JavaScript Fundamentals", students: 22, status: "Active", progress: 85, time: "04:00 PM" },
      { id: "REACT-01", name: "React JS Advanced", students: 22, status: "Completed", progress: 100, time: "06:00 PM" },
    ],
    studentPerf: { excellent: 24, good: 38, needsImp: 17, atRisk: 7 },
    schedule: {
      MON: [{ time: "10:00 AM", batch: "MERN-01" }, { time: "02:00 PM", batch: "MERN-02" }],
      TUE: [{ time: "10:00 AM", batch: "MERN-01" }, { time: "04:00 PM", batch: "JS-03" }],
      WED: [{ time: "10:00 AM", batch: "MERN-01" }, { time: "06:00 PM", batch: "REACT-01" }],
      THU: [{ time: "10:00 AM", batch: "MERN-01" }, { time: "02:00 PM", batch: "MERN-02" }],
      FRI: [{ time: "10:00 AM", batch: "MERN-01" }, { time: "04:00 PM", batch: "JS-03" }],
      SAT: [{ time: "11:00 AM", batch: "Doubt Clearing Clinic" }],
    },
    alerts: [
      { type: "warning", text: "Faculty is handling 27 hours/week across 4 batches." },
      { type: "success", text: "Student attendance increased by 6% this month." },
      { type: "danger", text: "7 students have attendance below the configured threshold." },
    ],
  },
  FA002: {
    id: "FA002",
    name: "Priya Sharma",
    email: "priya.sharma@gmail.com",
    phone: "9876543210",
    specialization: "Digital Marketing",
    branch: "Ramamurthy Nagar",
    batchesCount: 3,
    studentsCount: 62,
    attendance: 92,
    workloadHrs: 21,
    status: "Active",
    avatar: "https://i.pravatar.cc/150?u=priya",
    joinDate: "05 Jan 2025",
    experience: "5.2 Years",
    rating: 4.5,
    feedback: [
      { student: "Karan S.", text: "Great practical examples for SEO and analytics.", rating: 5, date: "01 Aug 2026" },
      { student: "Pooja D.", text: "Assignments are challenging and comprehensive.", rating: 4, date: "15 Jul 2026" },
    ],
    batches: [
      { id: "DM-01", name: "Digital Marketing Masterclass", students: 25, status: "Active", progress: 60, time: "11:00 AM" },
      { id: "SEO-02", name: "Search Engine Optimization", students: 20, status: "Active", progress: 40, time: "03:00 PM" },
    ],
    studentPerf: { excellent: 30, good: 20, needsImp: 10, atRisk: 2 },
    schedule: {
      MON: [{ time: "11:00 AM", batch: "DM-01" }],
      WED: [{ time: "11:00 AM", batch: "DM-01" }, { time: "03:00 PM", batch: "SEO-02" }],
      FRI: [{ time: "11:00 AM", batch: "DM-01" }],
    },
    alerts: [{ type: "success", text: "DM-01 syllabus is 60% complete." }],
  },
  FA003: {
    id: "FA003",
    name: "Rahul Verma",
    email: "rahul.verma@gmail.com",
    phone: "9988776655",
    specialization: "Python Programming",
    branch: "Bengaluru Central",
    batchesCount: 2,
    studentsCount: 45,
    attendance: 86,
    workloadHrs: 16,
    status: "On Leave",
    avatar: "https://i.pravatar.cc/150?u=rahul",
    joinDate: "20 Mar 2023",
    experience: "4.0 Years",
    rating: 3.9,
    feedback: [],
    batches: [
      { id: "PY-01", name: "Python for Data Science", students: 25, status: "Active", progress: 35, time: "09:00 AM" },
    ],
    studentPerf: { excellent: 10, good: 20, needsImp: 10, atRisk: 5 },
    schedule: {},
    alerts: [{ type: "warning", text: "Currently on approved leave." }],
  },
  FA004: {
    id: "FA004",
    name: "Sneha Reddy",
    email: "sneha.reddy@gmail.com",
    phone: "9123456780",
    specialization: "UI/UX Design",
    branch: "Malleswaram",
    batchesCount: 1,
    studentsCount: 18,
    attendance: 98,
    workloadHrs: 8,
    status: "Active",
    avatar: "https://i.pravatar.cc/150?u=sneha",
    joinDate: "10 Feb 2026",
    experience: "2.5 Years",
    rating: 4.9,
    feedback: [
      { student: "Akash R.", text: "Amazing mentor! Loved the hands-on Figma sessions.", rating: 5, date: "12 Aug 2026" },
    ],
    batches: [
      { id: "UIUX-01", name: "UI/UX Product Design", students: 18, status: "Active", progress: 50, time: "05:00 PM" },
    ],
    studentPerf: { excellent: 12, good: 5, needsImp: 1, atRisk: 0 },
    schedule: {
      TUE: [{ time: "05:00 PM", batch: "UIUX-01" }],
      THU: [{ time: "05:00 PM", batch: "UIUX-01" }],
    },
    alerts: [{ type: "success", text: "Highest student satisfaction rating (4.9/5)." }],
  },
};

const getWorkloadState = (hrs: number) => {
  if (hrs > 30) return { label: "High", color: "bg-red-500", text: "text-red-600", pct: Math.min(100, Math.round((hrs / 35) * 100)) };
  if (hrs > 20) return { label: "Moderate", color: "bg-amber-500", text: "text-amber-600", pct: Math.min(100, Math.round((hrs / 35) * 100)) };
  return { label: "Optimal", color: "bg-emerald-500", text: "text-emerald-600", pct: Math.min(100, Math.round((hrs / 35) * 100)) };
};

export const FacultyDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<
    "overview" | "batches" | "performance" | "schedule" | "feedback" | "attendance"
  >("overview");

  // Fetch from backend
  const { data: facultyResponse, isLoading, isError } = useFacultyMember(id);
  const { data: coursesResponse } = useFacultyCourses({ facultyId: id, limit: 50 });
  const { data: attendanceResponse } = useFacultyAttendance({ facultyId: id, limit: 50 });

  const backendFaculty = facultyResponse?.data;
  const facultyAssignments = coursesResponse?.data ?? [];
  const facultyAttendance = attendanceResponse?.data ?? [];

  // Match mock fallback if present
  const mockFallback = id ? MOCK_FACULTY_DETAILS[id] : null;

  if (isLoading && !mockFallback) {
    return (
      <div className="flex items-center justify-center py-28">
        <Loader2 className="h-8 w-8 animate-spin text-[#1769AA]" />
        <span className="ml-3 text-slate-600 font-medium">Loading faculty profile...</span>
      </div>
    );
  }

  if ((isError || !backendFaculty) && !mockFallback) {
    return (
      <div className="p-12 text-center max-w-md mx-auto">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4 opacity-70" />
        <h2 className="text-xl font-bold text-slate-900">Faculty Member Not Found</h2>
        <p className="text-slate-500 mt-2 mb-6 text-sm">
          Could not locate faculty member with ID: <span className="font-mono text-slate-800">{id}</span>
        </p>
        <Button className="bg-[#1769AA] text-white" onClick={() => navigate("/admin/faculty/all")}>
          Return to Faculty Directory
        </Button>
      </div>
    );
  }

  // Unified faculty data object
  const faculty = {
    id: backendFaculty?.id || mockFallback?.id || id || "FA001",
    name: backendFaculty?.user?.name || mockFallback?.name || "Faculty Member",
    email: backendFaculty?.user?.email || mockFallback?.email || "faculty@aadya.in",
    phone: backendFaculty?.user?.phone || mockFallback?.phone || "N/A",
    specialization: backendFaculty?.specialization || mockFallback?.specialization || "Technical Instructor",
    employeeCode: backendFaculty?.employeeCode || mockFallback?.id || "EMP-101",
    branch: backendFaculty?.branch?.name || mockFallback?.branch || "Bengaluru Central",
    status: backendFaculty?.status || mockFallback?.status || "Active",
    avatar: mockFallback?.avatar || `https://i.pravatar.cc/150?u=${id}`,
    joinDate: backendFaculty?.createdAt
      ? new Date(backendFaculty.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
      : mockFallback?.joinDate || "12 June 2024",
    experience: mockFallback?.experience || "3.5 Years",
    rating: mockFallback?.rating || 4.8,
    batchesCount: facultyAssignments.length || mockFallback?.batchesCount || 3,
    studentsCount:
      facultyAssignments.reduce((sum, a) => sum + (a._count?.enrollments ?? 0), 0) ||
      mockFallback?.studentsCount ||
      65,
    workloadHrs: mockFallback?.workloadHrs || 24,
    attendance: mockFallback?.attendance || 90,
    feedback: mockFallback?.feedback || [
      { student: "Student A", text: "Very supportive and thorough trainer.", rating: 5, date: "08 Aug 2026" },
      { student: "Student B", text: "Clear explanations and practical assignments.", rating: 4, date: "28 Jul 2026" },
    ],
    batches: mockFallback?.batches || [
      { id: "BATCH-01", name: "Full Stack Development", students: 25, status: "Active", progress: 65, time: "10:00 AM" },
      { id: "BATCH-02", name: "Frontend Engineering", students: 20, status: "Active", progress: 40, time: "02:00 PM" },
    ],
    studentPerf: mockFallback?.studentPerf || { excellent: 20, good: 30, needsImp: 10, atRisk: 5 },
    schedule: mockFallback?.schedule || {
      MON: [{ time: "10:00 AM", batch: "Regular Batch 1" }],
      WED: [{ time: "10:00 AM", batch: "Regular Batch 1" }, { time: "02:00 PM", batch: "Batch 2" }],
      FRI: [{ time: "10:00 AM", batch: "Regular Batch 1" }],
    },
    alerts: mockFallback?.alerts || [{ type: "success", text: "Class delivery on schedule." }],
  };

  const workloadState = getWorkloadState(faculty.workloadHrs);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto pb-12">
      {/* ─── 1. TOP BREADCRUMB & HEADER ───────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/admin/faculty/all")}
            className="h-9 w-9 rounded-lg border-slate-200"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Faculty Profile & Performance Hub
              </span>
              <span className="text-slate-300">•</span>
              <span className="font-mono text-xs font-bold text-[#1769AA] bg-blue-50 px-2 py-0.5 rounded">
                {faculty.employeeCode}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{faculty.name}</h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/admin/faculty/courses?facultyId=${faculty.id}`)}
            className="border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold h-9"
          >
            <BookOpen className="mr-1.5 h-4 w-4 text-[#1769AA]" /> View Course Allocations
          </Button>
          <Button
            onClick={() => alert(`Opening message composer for ${faculty.name}`)}
            className="bg-[#1769AA] hover:bg-[#125890] text-white text-xs font-semibold h-9 shadow-sm"
          >
            <Mail className="mr-1.5 h-4 w-4" /> Message Faculty
          </Button>
        </div>
      </div>

      {/* ─── 2. HERO PROFILE BANNER ───────────────────────────────────── */}
      <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <img
                src={faculty.avatar}
                alt={faculty.name}
                className="w-20 h-20 rounded-2xl border-2 border-slate-200 shadow-md object-cover shrink-0"
              />
              <div>
                <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                  <h2 className="text-2xl font-bold text-slate-900">{faculty.name}</h2>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      faculty.status === "Active"
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-200/60"
                        : "bg-amber-50 text-amber-600 border border-amber-200/60"
                    }`}
                  >
                    {faculty.status}
                  </span>
                  {faculty.rating > 0 && (
                    <span className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
                      <Star className="h-3.5 w-3.5 fill-current text-amber-500" /> {faculty.rating} / 5.0 Rating
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 font-medium flex flex-wrap items-center gap-3 mb-2">
                  <span className="font-mono font-bold text-slate-700">{faculty.employeeCode}</span>
                  <span>•</span>
                  <span className="text-[#1769AA] font-semibold">{faculty.specialization}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-slate-400" /> {faculty.branch}
                  </span>
                </p>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-medium">
                  <a href={`mailto:${faculty.email}`} className="hover:text-[#1769AA] flex items-center gap-1.5 transition-colors">
                    <Mail className="h-3.5 w-3.5 text-slate-400" /> {faculty.email}
                  </a>
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-slate-400" /> +91 {faculty.phone}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span>Teaching Exp: <strong className="text-slate-700">{faculty.experience}</strong></span>
                </div>
              </div>
            </div>

            <div className="text-right shrink-0 bg-slate-50 p-3.5 rounded-xl border border-slate-100 hidden lg:block">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Academy Tenure</p>
              <p className="text-xs font-bold text-slate-800 mt-1">Joined {faculty.joinDate}</p>
              <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Verified Instructor</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── 3. TOP KPI SNAPSHOT CARDS ────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Assigned Batches</p>
            <h4 className="text-2xl font-black text-slate-900">{faculty.batchesCount}</h4>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Active ongoing</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Students Taught</p>
            <h4 className="text-2xl font-black text-slate-900">{faculty.studentsCount}</h4>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Across batches</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Weekly Workload</p>
            <h4 className="text-2xl font-black text-[#1769AA]">
              {faculty.workloadHrs}h <span className="text-sm font-normal text-slate-400">/wk</span>
            </h4>
            <p className={`text-[11px] font-bold mt-0.5 ${workloadState.text}`}>{workloadState.label} Load</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Attendance Rate</p>
            <h4 className="text-2xl font-black text-emerald-600">{faculty.attendance}%</h4>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* ─── 4. TAB NAVIGATION & CONTENT ──────────────────────────────── */}
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-xl overflow-x-auto">
          {[
            { id: "overview", label: "Overview & Credentials", icon: Award },
            { id: "batches", label: `Assigned Batches (${faculty.batches.length})`, icon: BookOpen },
            { id: "performance", label: "Student Progress & Analytics", icon: MonitorPlay },
            { id: "schedule", label: "Weekly Schedule", icon: Calendar },
            { id: "feedback", label: `Student Reviews (${faculty.feedback.length})`, icon: Star },
            { id: "attendance", label: `Attendance Log (${facultyAttendance.length})`, icon: Clock },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 py-2 px-3.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-white text-[#1769AA] shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ─── TAB 1: OVERVIEW & CREDENTIALS ──────────────────────────── */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5 px-6">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Award className="h-4 w-4 text-[#1769AA]" /> Academic & Professional Credentials
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-semibold">Employee ID</span>
                  <span className="font-mono font-bold text-slate-900">{faculty.employeeCode}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-semibold">Assigned Branch</span>
                  <span className="font-bold text-slate-900">{faculty.branch}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-semibold">Primary Specialization</span>
                  <span className="font-bold text-[#1769AA]">{faculty.specialization}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-semibold">Teaching Experience</span>
                  <span className="font-bold text-slate-900">{faculty.experience}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500 font-semibold">Joined Academy</span>
                  <span className="font-bold text-slate-900">{faculty.joinDate}</span>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {/* Teaching Capacity Card */}
              <Card className="border-slate-200 shadow-sm bg-white">
                <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5 px-6">
                  <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-[#1769AA]" /> Teaching Workload Capacity
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-3 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-semibold">Weekly Hours Scheduled</span>
                    <span className={`font-bold ${workloadState.text}`}>{faculty.workloadHrs} Hours ({workloadState.label})</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div className={`h-full ${workloadState.color} rounded-full`} style={{ width: `${workloadState.pct}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                    <span>0 hrs</span>
                    <span>Optimal (20h)</span>
                    <span>Max Capacity (35h)</span>
                  </div>
                </CardContent>
              </Card>

              {/* Alerts & Insights */}
              {faculty.alerts.length > 0 && (
                <div className="space-y-2">
                  {faculty.alerts.map((alert: any, i: number) => (
                    <div
                      key={i}
                      className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs font-medium ${
                        alert.type === "warning"
                          ? "bg-amber-50 border-amber-200 text-amber-800"
                          : alert.type === "danger"
                          ? "bg-red-50 border-red-200 text-red-800"
                          : "bg-emerald-50 border-emerald-200 text-emerald-800"
                      }`}
                    >
                      {alert.type === "warning" && <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />}
                      {alert.type === "danger" && <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />}
                      {alert.type === "success" && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />}
                      <span>{alert.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 2: ASSIGNED BATCHES & COURSES ─────────────────────── */}
        {activeTab === "batches" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {faculty.batches.map((b: any) => (
                <Card key={b.id} className="border-slate-200 shadow-sm bg-white hover:border-[#1769AA]/30 transition-all">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-[#1769AA] bg-blue-50 px-2 py-0.5 rounded">
                          {b.id}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 mt-1.5">{b.name}</h4>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          b.status === "Active"
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                            : "bg-purple-50 text-purple-600 border border-purple-200"
                        }`}
                      >
                        {b.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 pt-1">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-slate-400" /> {b.students} Students Enrolled
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-400" /> Timing: {b.time}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold text-slate-600">Curriculum Progression</span>
                        <span className="font-bold text-[#1769AA]">{b.progress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="h-full bg-[#1769AA] rounded-full transition-all" style={{ width: `${b.progress}%` }} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB 3: STUDENT PROGRESS & ANALYTICS ───────────────────── */}
        {activeTab === "performance" && (
          <div className="space-y-6">
            {/* Grade Distribution */}
            <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5 px-6">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <MonitorPlay className="h-4 w-4 text-[#1769AA]" /> Student Grade & Attendance Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-100 text-center">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Excellent (&gt;85%)</span>
                    <h4 className="text-3xl font-black text-emerald-700 mt-1">{faculty.studentPerf.excellent}</h4>
                    <p className="text-[10px] text-emerald-600 mt-0.5">Top scorers</p>
                  </div>
                  <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100 text-center">
                    <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Good (70-85%)</span>
                    <h4 className="text-3xl font-black text-[#1769AA] mt-1">{faculty.studentPerf.good}</h4>
                    <p className="text-[10px] text-blue-600 mt-0.5">Regular on-track</p>
                  </div>
                  <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-100 text-center">
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Needs Imp. (50-70%)</span>
                    <h4 className="text-3xl font-black text-amber-700 mt-1">{faculty.studentPerf.needsImp}</h4>
                    <p className="text-[10px] text-amber-600 mt-0.5">Extra clinic needed</p>
                  </div>
                  <div className="bg-red-50/60 p-4 rounded-xl border border-red-100 text-center">
                    <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider">At Risk (&lt;50%)</span>
                    <h4 className="text-3xl font-black text-red-700 mt-1">{faculty.studentPerf.atRisk}</h4>
                    <p className="text-[10px] text-red-600 mt-0.5">Discontinuation risk</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 leading-relaxed">
                  <strong>Academic Support Strategy:</strong> Faculty conducts weekly remedial sessions on Saturdays for students requiring additional assistance.
                </div>
              </CardContent>
            </Card>

            {/* Attendance Trend Chart */}
            <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5 px-6 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-600" /> Monthly Faculty Attendance Trend (Last 6 Months)
                </CardTitle>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                  +4.2% Consistency
                </span>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={ATTENDANCE_TREND}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94A3B8" fontSize={11} domain={[70, 100]} tickLine={false} axisLine={false} unit="%" />
                      <RechartsTooltip
                        contentStyle={{ borderRadius: "12px", border: "1px solid #E2E8F0" }}
                        formatter={(val: any) => [`${val}%`, "Attendance"]}
                      />
                      <Line
                        type="monotone"
                        dataKey="val"
                        stroke="#1769AA"
                        strokeWidth={3}
                        dot={{ r: 4, fill: "#1769AA", strokeWidth: 2, stroke: "#fff" }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ─── TAB 4: WEEKLY SCHEDULE ─────────────────────────────────── */}
        {activeTab === "schedule" && (
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5 px-6">
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#1769AA]" /> Weekly Class Timetable
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {["MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day) => {
                  const slots = faculty.schedule[day] || [];
                  return (
                    <div key={day} className="bg-slate-50/60 p-3.5 rounded-xl border border-slate-100 space-y-2">
                      <span className="text-xs font-black text-[#1769AA] tracking-wider block">{day}</span>
                      {slots.length > 0 ? (
                        slots.map((s: any, idx: number) => (
                          <div key={idx} className="p-2 rounded bg-white border border-slate-200/80 text-xs shadow-2xs">
                            <p className="font-bold text-slate-900">{s.batch}</p>
                            <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                              <Clock className="h-3 w-3 text-[#1769AA]" /> {s.time}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400 italic py-2">No classes</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── TAB 5: STUDENT FEEDBACK & REVIEWS ───────────────────────── */}
        {activeTab === "feedback" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {faculty.feedback.map((item: any, i: number) => (
                <Card key={i} className="border-slate-200 shadow-sm bg-white">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, starIdx) => (
                          <Star
                            key={starIdx}
                            className={`h-3.5 w-3.5 ${starIdx < item.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`}
                          />
                        ))}
                      </div>
                      <span className="text-[11px] text-slate-400">{item.date}</span>
                    </div>
                    <p className="text-xs text-slate-700 font-medium italic">"{item.text}"</p>
                    <p className="text-xs font-bold text-slate-900">— {item.student}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB 6: ATTENDANCE LOG ─────────────────────────────────── */}
        {activeTab === "attendance" && (
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardContent className="p-0">
              {facultyAttendance.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {facultyAttendance.map((record) => (
                    <div key={record.id} className="p-4 flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-slate-900">{formatDate(record.classSession.scheduledDate)}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {record.classSession.batch?.name} ({record.classSession.batch?.code}) • {record.classSession.startTime} – {record.classSession.endTime}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-slate-500">
                          {record.loginAt ? `In: ${formatTime(record.loginAt)}` : "No login"}
                          {record.logoutAt ? ` — Out: ${formatTime(record.logoutAt)}` : ""}
                        </span>
                        <Badge variant={record.loginAt ? "default" : "secondary"} className={record.loginAt ? "bg-emerald-600 text-white" : ""}>
                          {record.loginAt ? "Present" : "No Record"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No attendance session records logged for {faculty.name} yet.
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
